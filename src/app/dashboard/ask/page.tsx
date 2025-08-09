
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Sparkles, User } from 'lucide-react';
import { selectExpertForQuestion } from '@/ai/flows/select-expert-for-question';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type Message = {
    sender: 'user' | 'ai';
    text: string;
};

export default function ChatWithAzaiPage() {
    const { toast } = useToast();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const savedMessages = sessionStorage.getItem('chatHistory');
            if (savedMessages) {
                setMessages(JSON.parse(savedMessages));
            }
        } catch (error) {
            console.error("Could not load chat history from sessionStorage", error);
        }
    }, []);

    useEffect(() => {
        try {
            sessionStorage.setItem('chatHistory', JSON.stringify(messages));
            if (scrollAreaRef.current) {
                scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
            }
        } catch (error) {
            console.error("Could not save chat history to sessionStorage", error);
        }
    }, [messages]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await selectExpertForQuestion({ question: input });
            const aiMessage: Message = { sender: 'ai', text: response.answer };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Could not process your question. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="h-[calc(100vh-6rem)] flex flex-col">
            <CardHeader>
                <CardTitle className="text-3xl font-bold font-headline">Chat with Azai</CardTitle>
                <CardDescription>Your AI nutrition assistant. Ask me anything about your diet or health!</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4 lg:p-6" ref={scrollAreaRef}>
                    <div className="space-y-6">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={cn(
                                    'flex items-end gap-2',
                                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                                )}
                            >
                                {message.sender === 'ai' && (
                                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                        <AvatarFallback><Sparkles size={16} /></AvatarFallback>
                                    </Avatar>
                                )}
                                <div
                                    className={cn(
                                        'max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 whitespace-pre-wrap',
                                        message.sender === 'user'
                                            ? 'bg-primary text-primary-foreground rounded-br-none'
                                            : 'bg-muted rounded-bl-none'
                                    )}
                                >
                                    {message.text}
                                </div>
                                 {message.sender === 'user' && (
                                    <Avatar className="h-8 w-8 bg-secondary text-secondary-foreground">
                                        <AvatarFallback><User size={16}/></AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))}
                         {isLoading && (
                            <div className="flex items-end gap-2 justify-start">
                               <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                    <AvatarFallback><Sparkles size={16} /></AvatarFallback>
                                </Avatar>
                                <div className="bg-muted rounded-lg px-4 py-3 rounded-bl-none flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t bg-background">
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <Input
                            id="message"
                            placeholder="Type your message..."
                            autoComplete="off"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                        />
                        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                            {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
}
