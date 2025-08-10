'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
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
    const [isKashmir, setIsKashmir] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            const savedMessages = sessionStorage.getItem('chatHistory');
            if (savedMessages) {
                setMessages(JSON.parse(savedMessages));
            }

            const onboardingDataString = localStorage.getItem('onboardingData');
            if (onboardingDataString) {
                const onboardingData = JSON.parse(onboardingDataString);
                if (onboardingData.geographicLocation?.toLowerCase().includes('kashmir')) {
                    setIsKashmir(true);
                }
            } else {
                 const loggedInEmail = localStorage.getItem('loggedInEmail');
                 if (loggedInEmail === 'care@aziaf.com') {
                     setIsKashmir(true);
                 }
            }

        } catch (error) {
            console.error("Could not load session data", error);
        }
    }, []);

    useEffect(() => {
        try {
            sessionStorage.setItem('chatHistory', JSON.stringify(messages));
            if (scrollAreaRef.current) {
                setTimeout(() => {
                    if (scrollAreaRef.current) {
                        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
                    }
                }, 100);
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
            const response = await selectExpertForQuestion({ question: input, isKashmir });
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
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-card rounded-xl border shadow-lg">
             <div className="p-4 border-b">
                <h2 className="text-xl font-bold font-headline">Chat with Aziaf</h2>
                <p className="text-sm text-muted-foreground">Your nutrition assistant. Knowledge base: <span className="font-semibold text-primary">{isKashmir ? 'Kashmir' : 'General'}</span></p>
            </div>
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
                                    'max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 whitespace-pre-wrap shadow-sm relative',
                                    message.sender === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-br-none before:content-[\'\'] before:absolute before:bottom-0 before:right-[-8px] before:border-b-8 before:border-l-8 before:border-b-transparent before:border-l-primary'
                                        : 'bg-muted rounded-bl-none before:content-[\'\'] before:absolute before:bottom-0 before:left-[-8px] before:border-b-8 before:border-r-8 before:border-b-transparent before:border-r-muted'
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
            <div className="p-4 border-t bg-background rounded-b-xl">
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
        </div>
    );
}